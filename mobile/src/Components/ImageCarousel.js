import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Swiper from 'react-native-swiper';

const Carousel1 = require('../assets/carousel1.png');
const Carousel2 = require('../assets/carousel2.png');
const Carousel3 = require('../assets/carousel3.png');
const Carousel4 = require('../assets/carousel4.png');

const { width } = Dimensions.get('window');

const ImageCarousel = () => {
  return (
    <View style={styles.carouselContainer}>
      <Swiper
        autoplay
        autoplayTimeout={3}
        showsPagination
        dotStyle={styles.dotStyle}
        activeDotStyle={styles.activeDotStyle}
        paginationStyle={styles.paginationStyle}
      >
        <View style={styles.slide}>
          <Image source={Carousel1} style={styles.carouselImage} />
        </View>
        <View style={styles.slide}>
          <Image source={Carousel2} style={styles.carouselImage} />
        </View>
        <View style={styles.slide}>
          <Image source={Carousel3} style={styles.carouselImage} />
        </View>
        <View style={styles.slide}>
          <Image source={Carousel4} style={styles.carouselImage} />
        </View>
      </Swiper>
    </View>
  );
};

export default ImageCarousel;

const styles = StyleSheet.create({
  carouselContainer: {
    width: '100%',
    height: width * 0.8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e0ac0096',
    borderRadius: 16,
    backgroundColor: '#fff3ca83',
    overflow: 'hidden',
    paddingTop: 20,
    paddingBottom: 20
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  dotStyle: {
    backgroundColor: '#fd222840',
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 3,
  },
  activeDotStyle: {
    backgroundColor: '#fd2228',
    width: 10,
    height: 10,
    borderRadius: 5,
    margin: 3,
  },
  paginationStyle: {
    bottom: -17,
  },
});
