'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Center, Outlines } from '@react-three/drei';
import * as THREE from 'three';

// CD Disc Component with proper materials
function CDDisc({ position, onClick, isSelected }: { position: [number, number, number], onClick: () => void, isSelected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.2}>
        <mesh
          ref={meshRef}
          position={position}
          onClick={onClick}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[1.2, 1.2, 0.05, 32]} />
          <meshPhysicalMaterial
            color="#ff6b9d"
            metalness={0.8}
            roughness={0.1}
            clearcoat={1}
            clearcoatRoughness={0}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
          
          {/* Play Button in Center */}
          <mesh position={[0, 0.026, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.02, 32]} />
            <meshPhysicalMaterial 
              color="#ff6b35" 
              metalness={0.1}
              roughness={0.2}
              clearcoat={1}
              emissive="#ff6b35"
              emissiveIntensity={0.2}
            />
          </mesh>
          
          {/* Play Triangle Icon */}
          <mesh position={[0.03, 0.04, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            <coneGeometry args={[0.08, 0.15, 3]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive="#ffffff" 
              emissiveIntensity={0.3}
            />
          </mesh>
          
          {/* Center hole (smaller now) */}
          <mesh position={[0, 0.005, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.08, 16]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          
          {/* Outline effect when selected */}
          {isSelected && (
            <Outlines thickness={8} color="cyan" transparent opacity={0.8} />
          )}
        </mesh>
      </Float>
    </group>
  );
}

// Wooden Box/Drawer Component
function WoodenDrawer({ isOpen }: { isOpen: boolean }) {
  return (
    <group position={[0, -1, 0]}>
      {/* Drawer Box */}
      <mesh position={[0, 0, isOpen ? 1 : 0]} castShadow>
        <boxGeometry args={[3, 0.8, 1.5]} />
        <meshPhysicalMaterial
          color="#8B4513"
          roughness={0.8}
          metalness={0.1}
          normalScale={new THREE.Vector2(0.5, 0.5)}
        />
        
        {/* Drawer Handle */}
        <mesh position={[0, 0, 0.76]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
          <meshPhysicalMaterial color="#DAA520" metalness={0.8} roughness={0.2} />
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
            <meshPhysicalMaterial color="#DAA520" metalness={0.8} roughness={0.2} />
          </mesh>
        </mesh>
      </mesh>
      
      {/* Cabinet Frame */}
      <mesh position={[0, 0, -0.8]} receiveShadow>
        <boxGeometry args={[3.2, 1, 2]} />
        <meshPhysicalMaterial
          color="#654321"
          roughness={0.9}
          metalness={0.05}
        />
        {/* Opening for drawer */}
        <mesh position={[0, 0, 0.8]}>
          <boxGeometry args={[2.9, 0.7, 0.1]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </mesh>
    </group>
  );
}

// Interactive Orb Component
function InteractiveOrb({ position, color, onClick, isSelected }: { 
  position: [number, number, number], 
  color: string, 
  onClick: () => void,
  isSelected: boolean 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  return (
    <group>
      <Float speed={4} rotationIntensity={1} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          position={position}
          onClick={onClick}
          castShadow
        >
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshPhysicalMaterial
            color={color}
            metalness={0.6}
            roughness={0.1}
            clearcoat={1}
            transmission={0.1}
            thickness={0.5}
          />
          
          {/* Outline effect when selected */}
          {isSelected && (
            <Outlines thickness={10} color="cyan" transparent opacity={0.8} />
          )}
        </mesh>
      </Float>
    </group>
  );
}

// Main 3D Scene Component
function Scene({ onCDClick, onOrbClick, selectedObject }: { 
  onCDClick: () => void, 
  onOrbClick: (name: string) => void,
  selectedObject: string | null 
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff6b9d" />
      
      {/* 3D Objects */}
      <CDDisc 
        position={[0, 1, 0]} 
        onClick={onCDClick}
        isSelected={selectedObject === 'CD'}
      />
      
      <InteractiveOrb 
        position={[-3, 0.5, 0]} 
        color="#ff6b35"
        onClick={() => onOrbClick('Orange Orb')}
        isSelected={selectedObject === 'Orange Orb'}
      />
      
      <InteractiveOrb 
        position={[3, 0.5, 0]} 
        color="#4ecdc4"
        onClick={() => onOrbClick('Teal Orb')}
        isSelected={selectedObject === 'Teal Orb'}
      />
      
      <InteractiveOrb 
        position={[0, 0.5, -3]} 
        color="#45b7d1"
        onClick={() => onOrbClick('Blue Orb')}
        isSelected={selectedObject === 'Blue Orb'}
      />
      
      <WoodenDrawer isOpen={true} />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshLambertMaterial color="#2d3748" />
      </mesh>
      
      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.5}
      />
      
      {/* Environment */}
      <Environment preset="city" background blur={0.8} />
    </>
  );
}

export default function ExperimentalPage() {
  const router = useRouter();
  const [selectedObject, setSelectedObject] = useState<string | null>(null);

  const handleCDClick = () => {
    setSelectedObject('CD');
    setTimeout(() => {
      router.push('/map');
    }, 1000);
  };

  const handleOrbClick = (name: string) => {
    setSelectedObject(name);
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-slate-900 to-black">
      <Canvas
        shadows
        camera={{ position: [5, 5, 5], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <Scene 
            onCDClick={handleCDClick}
            onOrbClick={handleOrbClick}
            selectedObject={selectedObject}
          />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/80 text-center">
        <p className="text-sm">Click objects to see outline effects • CD → Navigate to Map</p>
        {selectedObject && (
          <div className="mt-2 text-cyan-400 text-sm font-medium">
            🎯 Selected: {selectedObject}
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {selectedObject && (
        <div className="absolute top-4 right-4 bg-cyan-500/20 border border-cyan-400/50 rounded-lg px-4 py-2 text-cyan-400">
          <div className="text-sm font-medium">✨ Object Selected</div>
          <div className="text-xs opacity-80">{selectedObject}</div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-black/50 text-white text-sm p-3 rounded-lg max-w-xs">
        <h3 className="font-medium mb-2">🎮 Controls</h3>
        <div className="space-y-1 text-xs opacity-80">
          <div>• Click objects for cyan outlines</div>
          <div>• Drag to rotate view</div>
          <div>• Scroll to zoom</div>
          <div>• Auto-rotation enabled</div>
        </div>
      </div>

    </div>
  );
}