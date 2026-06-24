import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// The Matrix Grid settings
const SPACING = 45; // Distance between nodes
const COLORS = ['#3366FF', '#7C3AED', '#ffa033ff', '#FF3D71', '#ffe25fff', '#ff1f1fff']; // 6 Neon Colors
const BASE_COLOR = '#333333ff'; // Subtle base color for resting nodes

const cols = Math.ceil(width / SPACING) + 1;
const rows = Math.ceil(height / SPACING) + 1;

// Single Node Component
const MatrixNode = ({
  x,
  y,
  waveProgress,
  neonColor,
}: {
  x: number;
  y: number;
  waveProgress: { value: number };
  neonColor: string;
}) => {
  // Calculate distance from the sweeping wave. 
  // Wave equation: x + y = waveProgress
  const waveWidth = 250; // How wide the wave is

  const intensity = useDerivedValue(() => {
    const dist = Math.abs(x + y - waveProgress.value);
    if (dist < waveWidth) {
      // Creates a smooth bell-curve like intensity (1 at center, 0 at edge)
      return Math.cos((dist / waveWidth) * (Math.PI / 2));
    }
    return 0;
  });

  const transform = useDerivedValue(() => {
    return [
      { rotate: intensity.value * Math.PI }, // Rotate up to 180 degrees
      { scale: 1 + intensity.value * 1.5 }   // Scale from 1 to 2.5
    ];
  });

  const neonOpacity = useDerivedValue(() => {
    return intensity.value * 0.9; // Peak opacity 0.9
  });

  // Create the '+' path centered at (x,y)
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const halfLen = 3; // Length of each arm of the +
    p.moveTo(x - halfLen, y);
    p.lineTo(x + halfLen, y);
    p.moveTo(x, y - halfLen);
    p.lineTo(x, y + halfLen);
    return p;
  }, [x, y]);

  return (
    <Group origin={{ x, y }} transform={transform}>
      <Path path={path} color={BASE_COLOR} style="stroke" strokeWidth={1.5} opacity={0.3} />
      <Path path={path} color={neonColor} style="stroke" strokeWidth={1.5} opacity={neonOpacity} />
    </Group>
  );
};

export default function AnimatedBackground() {
  // Wave progresses diagonally from top-left (0) to bottom-right (width + height)
  const maxWaveDist = width + height + 200;
  const waveProgress = useSharedValue(-200);

  useEffect(() => {
    waveProgress.value = withRepeat(
      withTiming(maxWaveDist, {
        duration: 4000, // Speed of the wave
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Do not reverse
    );
  }, []);

  // Generate grid coordinates once
  const nodes = useMemo(() => {
    const grid = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * SPACING;
        const y = j * SPACING;
        // Deterministic color assignment based on coordinates
        const colorIndex = (i + j) % COLORS.length;
        grid.push({ x, y, color: COLORS[colorIndex] });
      }
    }
    return grid;
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      <Canvas style={{ flex: 1 }}>
        {nodes.map((node, index) => (
          <MatrixNode
            key={index}
            x={node.x}
            y={node.y}
            waveProgress={waveProgress}
            neonColor={node.color}
          />
        ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    // Note: Transparent background is required here so we don't cover the screen's base background
    backgroundColor: '#ffffff'
  },
});
