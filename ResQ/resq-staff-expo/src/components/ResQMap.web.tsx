import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ResQMap(props: any) {
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#242f3e', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: 'white' }}>Map is not supported on web in this build.</Text>
    </View>
  );
}
