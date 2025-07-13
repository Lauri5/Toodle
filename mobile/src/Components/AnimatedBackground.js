import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Easing,
  Image,
  StyleSheet,
} from 'react-native';

const bigPattern = require('../assets/bigPattern.png');

const imageWidth = 1500;
const imageHeight = 1000;

export default function AnimatedBackground({ children }) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animValue, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, [animValue]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-imageWidth, 0],
  });
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-imageHeight, 0],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.tileWrapper,
          {
            transform: [
              { translateX },
              { translateY },
            ],
          },
        ]}
      >
        {/* Top-left tile */}
        <Image
          source={bigPattern}
          style={[styles.tile, { left: 0, top: 0 }]}
          resizeMode="cover"
        />

        {/* Top-right tile */}
        <Image
          source={bigPattern}
          style={[styles.tile, { left: imageWidth, top: 0 }]}
          resizeMode="cover"
        />

        {/* Bottom-left tile */}
        <Image
          source={bigPattern}
          style={[styles.tile, { left: 0, top: imageHeight }]}
          resizeMode="cover"
        />

        {/* Bottom-right tile */}
        <Image
          source={bigPattern}
          style={[styles.tile, { left: imageWidth, top: imageHeight }]}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Render child screens on top */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  tileWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    // 2× width & 2× height to hold four tiles
    width: imageWidth*2,
    height: imageHeight*2,
  },
  tile: {
    position: 'absolute',
    width: imageWidth,
    height: imageHeight,
  },
});
