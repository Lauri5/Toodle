import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import ColorPicker from 'react-native-wheel-color-picker';
import checkIcon from '../assets/check.png';

const CustomColorPicker = ({ visible, initialColor = '#000', onColorSelected }) => {
  const [currentColor, setCurrentColor] = useState(initialColor);

  const handleColorChange = (color) => {
    setCurrentColor(color);
  };

  const handleColorChangeComplete = (color) => {
    setCurrentColor(color);
  };

  if (!visible) return null;

  return (
    <View style={styles.modalContainer}>
      <ColorPicker
        color={currentColor}
        onColorChange={handleColorChange}
        onColorChangeComplete={handleColorChangeComplete}
        thumbSize={40}
        sliderSize={40}
        noSnap={true}
        row={false}
        autoResetSlider={true}
        swatches={false}
        discrete={false}
        sliderHidden={true}
        wheelLodingIndicator={<ActivityIndicator size={40} />}
        sliderLodingIndicator={<ActivityIndicator size={20} />}
        useNativeDriver={false}
        useNativeLayout={false}
        style={styles.colorPicker}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onColorSelected(currentColor)}>
          <Image source={checkIcon} style={styles.actionIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  actionButton: {
    padding: 10,
    borderRadius: 100,
    marginHorizontal: 4,
    backgroundColor: 'rgb(75, 236, 42)',
    borderWidth: 2,
    borderColor: 'rgb(41, 131, 23)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionIcon: {
    width: 24,
    height: 24,
  },
  colorPicker: {
    marginTop: 420,
    alignSelf: 'center',
    width: 300,
    height: 300,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: -15,
    marginBottom: -10,
  },
});

export default CustomColorPicker;