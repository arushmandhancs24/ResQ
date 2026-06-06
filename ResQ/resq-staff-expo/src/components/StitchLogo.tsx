import React from 'react';
import { View, Image } from 'react-native';

export default function StitchLogo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeMap = {
    sm: 24,
    md: 48,
    lg: 72,
  };
  return (
    <View className={`items-center justify-center bg-white rounded-md p-1 ${className}`}>
      <Image 
        source={require('../../assets/logo.png')} 
        style={{ width: sizeMap[size], height: sizeMap[size] }}
        resizeMode="contain"
      />
    </View>
  );
}
